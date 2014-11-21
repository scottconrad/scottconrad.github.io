(function (undefined) {

  var google_module = angular.module('Google', []);

  google_module.service('GoogleAuth', function ($location, $http, $rootScope) {

    var access_token = null;
    var client_id = '682690953089-pcokcr123r9m8v602p0rv9bi9vkfcsc0.apps.googleusercontent.com';
    var token_valid = false;
    var token_rejected = false;

    var obj = {
      ajaxing: false, //are we doing something?
      parseGoogleAuthTokenFromCurrentLocation: function () {
        //lifted straight from google, will refactor if I have time
        var queryString = location.hash.substring(1),
          regex = /([^&=]+)=([^&]*)/g, m;
        while (m = regex.exec(queryString)) {
          if (m[1] == "access_token") {
            access_token = decodeURIComponent(m[2]);
            this.setTokenValid();
            this.setTokenRejected(false);
          }
        }
      },
      getClientID: function () {
        return client_id;
      },
      getAccessToken: function () {
        return access_token;
      },
      setTokenInvalid: function () {
        token_valid = false;
      },
      setTokenValid: function () {
        token_valid = true;
      },
      tokenValid: function () {
        return token_valid;
      },
      getTokenRejected:function(){
        return token_rejected;
      },
      setTokenRejected:function(bool){
        token_rejected = bool;
      }
    }

    //ugh
    $rootScope.$on('authentication.invalid', function () {

      obj.setTokenInvalid();
      obj.setTokenRejected(true);
    });


    return obj;

  });

  google_module.service('GoogleCalendar', function ($location, $http, GoogleAuth, $q) {

    var auth = GoogleAuth; //i know this isn't exactly necessary but I think its easier to follow
    var active_calendar = null;

    return {
      getAuthHeaderData: function () {
        return {'Authorization': 'Bearer ' + auth.getAccessToken()}

      },

      getActiveCalendarName:function(){ //i should call get get summary but I think name is better
        if(active_calendar && active_calendar.summary) return active_calendar.summary;
      },

      getListForDate: function (date) {
        var deferred = $q.defer();
        //code smell.. i know i know.. on a deadline
        if (!GoogleAuth.getAccessToken()) {
          deferred.resolve([]);
          return deferred.promise;
        }

        var day = moment(date);
        var day2 = moment(date);

        var min_time = day.startOf('day').toISOString();
        var max_time = day2.startOf('day').add(1, 'day').toISOString();

        var deferred = $q.defer();
        console.log('get list was called');
        $http({
          'method': 'GET',
          'params': {
            'timeMin': min_time,
            'timeMax': max_time,
            'orderBy':'startTime',
            'singleEvents':true
          },
          'url': 'https://www.googleapis.com/calendar/v3/calendars/' + active_calendar.toString() + '/events',
          'headers': this.getAuthHeaderData()
        }).success(function (data) {
          //get ourselves a list we can populate a dropdown from
          deferred.resolve(data.items);
        });
        return deferred.promise;
      },

      getListForCurrentDate: function () {
        var d = new Date();
        return this.getListForDate(d);
      },


      getList: function () {
        var deferred = $q.defer();
        if (!GoogleAuth.getAccessToken()) {
          deferred.resolve([]);
          return deferred.promise;
        }
        console.log('get list was called');
        $http({
          'method': 'GET',
          'url': 'https://www.googleapis.com/calendar/v3/users/me/calendarList',
          'headers': this.getAuthHeaderData()
        }).success(function (data) {
          //get ourselves a list we can populate a dropdown from
          deferred.resolve(data.items);

        });
        return deferred.promise;
      },
      getListForCalendarId: function (id) {

        var deferred = $q.defer();
        console.log('get list was called');
        active_calendar = id;
        $http({
          'method': 'GET',
          'url': 'https://www.googleapis.com/calendar/v3/calendars/' + id.toString() + '/events?orderBy=startTime&singleEvents=true',
          'headers': this.getAuthHeaderData()
        }).success(function (data) {
          //get ourselves a list we can populate a dropdown from
          deferred.resolve(data.items);
        });
        return deferred.promise;

      },

      createEvent: function (data) {
        //translate the data into something it wants....

        console.log('the passed in data is:', data);

        //build the data


        var start_hour = data.start.hour;

        var end_hour = data.end.hour;

        if (parseInt(data.start.meridian) == 2) start_hour += 12;

        if (parseInt(data.end.meridian) == 2) end_hour += 12;

        var moment_date_start = moment(data.start.date);
        var moment_date_end = angular.copy(moment_date_start);


        moment_date_start.hour(start_hour).minute(data.start.minute);
        moment_date_end.hour(end_hour).minute(data.end.minute);

        data.summary = data.name;
        delete(data['name']);

        data.start = {'dateTime': moment_date_start.format("YYYY-MM-DDTHH:mm:ssZ"), 'timeZone': data.start.timeZone};
        data.end = {'dateTime': moment_date_end.format("YYYY-MM-DDTHH:mm:ssZ"), 'timeZone': data.end.timeZone};

        $http({
          'method': 'POST',
          'url': 'https://www.googleapis.com/calendar/v3/calendars/' + data.calendar_id.toString() + '/events',
          'headers': this.getAuthHeaderData(),
          'data': data
        }).success(function (data) {
          return data;
        });
      },
      setActiveCalendar:function(calendar){
        active_calendar = calendar;
      }
    }
  });

  var application = angular.module('Mobiquity.googleCalendar', ['Google']);

  application.config(function ($locationProvider, $httpProvider, $injector) {
    $locationProvider.html5Mode({
      enabled: true,
      requireBase: false
    });
    $httpProvider.interceptors.push(function ($q, $rootScope) {
      return {
        'responseError': function (resp) {
          if (resp.status == 401) {
            //$injector.get('GoogleAuth').setInvalidToken();  not sure why this isn't working... says it isn't found, but i'm using it
            //I know this is a judo
            $rootScope.$broadcast('authentication.invalid'); //ugh i hate this perhaps I can circle back later
          }
          console.log("resp is:", resp);
          return $q.reject(resp);
        }
      }
    });


  });

  application.run(function () {

  });

  application.controller('MainController', function ($scope, GoogleAuth, GoogleCalendar, $location, $window, $timeout) {

    $scope.google_auth = GoogleAuth;
    $scope.google_calendar = GoogleCalendar;

    $scope.authorize_url = 'https://accounts.google.com/o/oauth2/auth?redirect_uri=http%3A%2F%2Fhonopu.com' +
    '%2Fmobiquity&response_type=token&client_id=' + $scope.google_auth.getClientID() + '&scope=email+https%3A%2F%2F' +
    'www.googleapis.com%2Fauth%2Fcalendar+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar&approval_prompt=force';


    $scope.hours = [];

    $scope.minutes = [];


    for (var i = 1; i <= 12; i++) {
      $scope.hours.push(i);
    }

    for (var i = 0; i <= 11; i++) {
      var increment = i * 5;
      if (increment <= 5) {
        increment = "0" + increment; //there's about a billion ways to do this, this was the easiest
      }
      $scope.minutes.push(increment);
    }


    $scope.calendar_id = null;

    $scope.calendars = [];
    $scope.calendar_events = [];

    $scope.selected_date = new Date();


    $scope.dateChanged = function () {

      console.log("the date changed");
    }

    $scope.formatEventDate = function(date,format){
      if (!format) format = "MMMM do, YYYY [at] h:mma";
      var formatted_date = moment(date).format(format);
      console.log('formatted date is', formatted_date);
      return formatted_date;

    }

    $scope.getSelectedDateDisplay = function(){
      var format = 'MMMM do, YYYY';
      return $scope.formatEventDate(this.selected_date,format);
    }

    $scope.event = {
      name: '',
      description: '',
      'start': {
        'hour': '',
        'minute': '',
        'meridian': '',
        timeZone: ''
      },
      'end': {
        'hour': '',
        'minute': '',
        'meridian': '',
        'timeZone': ''
      },
      'calendar_id': ''
    }


    $scope.authenticatedAndValid = function(){
      return $scope.google_auth.tokenValid() && !$scope.google_auth.getTokenRejected();
    }

    $scope.showAuthenticationError = function(){

      return $scope.google_auth.getAccessToken() && $scope.google_auth.getAccessToken().length > 0 && $scope.google_auth.getTokenRejected();
    }


    $scope.createEvent = function () {
      var valid = $scope.addEvent.$valid;

      if (valid) {
        $scope.google_calendar.createEvent($scope.event);
        $timeout(function () {

        });
        $scope.addEvent.$setSubmitted(false);


      }
    }


    $scope.google_auth.parseGoogleAuthTokenFromCurrentLocation();


    $scope.getCalendarList = function () {
      $scope.google_calendar.getList().then(function (data) {
        $scope.calendars = data;
      });
    }

    $scope.updateEventDateFromCalendar = function (calendar) {
      $scope.event.start.timeZone = $scope.event.end.timeZone = calendar.timeZone;

    }


    $scope.getListForSelectedCalendar = function (calendar) {

      var encoded = encodeURIComponent($scope.calendar_id); //
      $scope.google_calendar.setActiveCalendar(calendar);
      $scope.google_calendar.getListForCalendarId(encoded).then(function (data) {
        $scope.calendar_events = data;

      });

      $scope.google_calendar.getListForCurrentDate().then(function (data) {
        console.log("our current day list is:", data);
        $scope.current_day_events = data;
      });

    }


    $timeout(function(){
      return;
      $scope.current_day_events = [
          {
            "kind": "calendar#event",
            "etag": "\"2832999878956000\"",
            "id": "10nsl1n755dvh5msn53sv71gpc",
            "status": "confirmed",
            "htmlLink": "https://www.google.com/calendar/event?eid=MTBuc2wxbjc1NWR2aDVtc241M3N2NzFncGMgc2NvdHRAaG9ub3B1LmNvbQ",
            "created": "2014-11-20T16:12:19.000Z",
            "updated": "2014-11-20T16:12:19.478Z",
            "summary": "An Event Today",
            "creator": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "organizer": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "start": {
              "dateTime": "2014-11-20T14:00:00-05:00"
            },
            "end": {
              "dateTime": "2014-11-20T18:30:00-05:00"
            },
            "iCalUID": "10nsl1n755dvh5msn53sv71gpc@google.com",
            "sequence": 0,
            "hangoutLink": "https://plus.google.com/hangouts/_/honopu.com/scott?hceid=c2NvdHRAaG9ub3B1LmNvbQ.10nsl1n755dvh5msn53sv71gpc",
            "reminders": {
              "useDefault": true
            }
          },
          {
            "kind": "calendar#event",
            "etag": "\"2833029454270000\"",
            "id": "aif4ab41td6tm7ellarolisj3c",
            "status": "confirmed",
            "htmlLink": "https://www.google.com/calendar/event?eid=YWlmNGFiNDF0ZDZ0bTdlbGxhcm9saXNqM2Mgc2NvdHRAaG9ub3B1LmNvbQ",
            "created": "2014-11-20T20:18:47.000Z",
            "updated": "2014-11-20T20:18:47.135Z",
            "summary": "Appointment",
            "location": "Somewhere",
            "creator": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "organizer": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "start": {
              "dateTime": "2014-11-20T18:18:47-05:00",
              "timeZone": "America/New_York"
            },
            "end": {
              "dateTime": "2014-11-20T20:18:47-05:00",
              "timeZone": "America/New_York"
            },
            "iCalUID": "aif4ab41td6tm7ellarolisj3c@google.com",
            "sequence": 0,
            "hangoutLink": "https://plus.google.com/hangouts/_/honopu.com/scott?hceid=c2NvdHRAaG9ub3B1LmNvbQ.aif4ab41td6tm7ellarolisj3c",
            "reminders": {
              "useDefault": true
            }
          },
          {
            "kind": "calendar#event",
            "etag": "\"2833029613814000\"",
            "id": "ueunpgn1l581oi2sr2i8hjalf8",
            "status": "confirmed",
            "htmlLink": "https://www.google.com/calendar/event?eid=dWV1bnBnbjFsNTgxb2kyc3IyaThoamFsZjggc2NvdHRAaG9ub3B1LmNvbQ",
            "created": "2014-11-20T20:20:06.000Z",
            "updated": "2014-11-20T20:20:06.907Z",
            "summary": "Appointment",
            "location": "Somewhere",
            "creator": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "organizer": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "start": {
              "dateTime": "2014-11-20T18:20:06-05:00",
              "timeZone": "America/New_York"
            },
            "end": {
              "dateTime": "2014-11-20T20:20:06-05:00",
              "timeZone": "America/New_York"
            },
            "iCalUID": "ueunpgn1l581oi2sr2i8hjalf8@google.com",
            "sequence": 0,
            "hangoutLink": "https://plus.google.com/hangouts/_/honopu.com/scott?hceid=c2NvdHRAaG9ub3B1LmNvbQ.ueunpgn1l581oi2sr2i8hjalf8",
            "reminders": {
              "useDefault": true
            }
          }
        ];

      $scope.calendar_events = [
          {
            "kind": "calendar#event",
            "etag": "\"2767184710040000\"",
            "id": "kqrrjq9pqoc1r7cgkul8r4varo",
            "status": "confirmed",
            "htmlLink": "https://www.google.com/calendar/event?eid=a3FycmpxOXBxb2MxcjdjZ2t1bDhyNHZhcm8gc2NvdHRAaG9ub3B1LmNvbQ",
            "created": "2013-11-04T18:56:52.000Z",
            "updated": "2013-11-04T19:12:35.020Z",
            "summary": "Universal Extras Kickoff",
            "creator": {
              "email": "rael.gc@gmail.com",
              "displayName": "Rael G.C."
            },
            "organizer": {
              "email": "rael.gc@gmail.com",
              "displayName": "Rael G.C."
            },
            "start": {
              "dateTime": "2013-11-06T08:00:00-05:00"
            },
            "end": {
              "dateTime": "2013-11-06T09:00:00-05:00"
            },
            "iCalUID": "kqrrjq9pqoc1r7cgkul8r4varo@google.com",
            "sequence": 0,
            "attendees": [
              {
                "email": "rael.gc@gmail.com",
                "displayName": "Rael G.C.",
                "organizer": true,
                "responseStatus": "accepted"
              },
              {
                "email": "scott@honopu.com",
                "displayName": "Scott Conrad",
                "self": true,
                "responseStatus": "accepted",
                "comment": "we are going to do this at 11am your time instead :) in the future we will refer to my time and I will always assume any time quoted is 3 hours later for you."
              }
            ],
            "reminders": {
              "useDefault": true
            }
          },
          {
            "kind": "calendar#event",
            "etag": "\"2798611161626000\"",
            "id": "uqimva9bi1f3kmsn7n5g1igedk",
            "status": "confirmed",
            "htmlLink": "https://www.google.com/calendar/event?eid=dXFpbXZhOWJpMWYza21zbjduNWcxaWdlZGsgc2NvdHRAaG9ub3B1LmNvbQ",
            "created": "2014-05-02T16:18:08.000Z",
            "updated": "2014-05-05T15:59:40.813Z",
            "summary": "Fund Faceoff Dev Review",
            "description": "Review our plans with Scott and create a quick punch list of things to get a new install working on staging.",
            "location": "Google hangout. bit.ly/curtisolson",
            "creator": {
              "email": "mr.curtis.olson@gmail.com",
              "displayName": "Curtis Olson"
            },
            "organizer": {
              "email": "mr.curtis.olson@gmail.com",
              "displayName": "Curtis Olson"
            },
            "start": {
              "dateTime": "2014-05-02T16:15:00-04:00"
            },
            "end": {
              "dateTime": "2014-05-02T17:00:00-04:00"
            },
            "iCalUID": "uqimva9bi1f3kmsn7n5g1igedk@google.com",
            "sequence": 1,
            "attendees": [
              {
                "email": "mr.curtis.olson@gmail.com",
                "displayName": "Curtis Olson",
                "organizer": true,
                "responseStatus": "accepted"
              },
              {
                "email": "scott.conrads@gmail.com",
                "displayName": "Scott Conrad",
                "responseStatus": "needsAction"
              },
              {
                "email": "scott@honopu.com",
                "displayName": "Scott Conrad",
                "self": true,
                "responseStatus": "needsAction"
              },
              {
                "email": "melissa@comradeagency.com",
                "responseStatus": "needsAction"
              },
              {
                "email": "stephen@comradeagency.com",
                "optional": true,
                "responseStatus": "needsAction"
              }
            ],
            "reminders": {
              "useDefault": true
            }
          },
          {
            "kind": "calendar#event",
            "etag": "\"2832840853296000\"",
            "id": "ilsbbhagqsv7me2d0eb0e7ecbo",
            "status": "confirmed",
            "htmlLink": "https://www.google.com/calendar/event?eid=aWxzYmJoYWdxc3Y3bWUyZDBlYjBlN2VjYm8gc2NvdHRAaG9ub3B1LmNvbQ",
            "created": "2014-11-19T18:07:06.000Z",
            "updated": "2014-11-19T18:07:06.648Z",
            "summary": "Scott Event 1",
            "creator": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "organizer": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "start": {
              "dateTime": "2014-11-17T04:00:00-05:00"
            },
            "end": {
              "dateTime": "2014-11-17T10:30:00-05:00"
            },
            "iCalUID": "ilsbbhagqsv7me2d0eb0e7ecbo@google.com",
            "sequence": 0,
            "hangoutLink": "https://plus.google.com/hangouts/_/honopu.com/scott?hceid=c2NvdHRAaG9ub3B1LmNvbQ.ilsbbhagqsv7me2d0eb0e7ecbo",
            "reminders": {
              "useDefault": true
            }
          },
          {
            "kind": "calendar#event",
            "etag": "\"2832840863198000\"",
            "id": "ojk5s45rpoaujvp67d5213qtvs",
            "status": "confirmed",
            "htmlLink": "https://www.google.com/calendar/event?eid=b2prNXM0NXJwb2F1anZwNjdkNTIxM3F0dnMgc2NvdHRAaG9ub3B1LmNvbQ",
            "created": "2014-11-19T18:07:11.000Z",
            "updated": "2014-11-19T18:07:11.599Z",
            "summary": "Scott Event 2",
            "creator": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "organizer": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "start": {
              "dateTime": "2014-11-19T07:30:00-05:00"
            },
            "end": {
              "dateTime": "2014-11-19T13:30:00-05:00"
            },
            "iCalUID": "ojk5s45rpoaujvp67d5213qtvs@google.com",
            "sequence": 0,
            "hangoutLink": "https://plus.google.com/hangouts/_/honopu.com/scott?hceid=c2NvdHRAaG9ub3B1LmNvbQ.ojk5s45rpoaujvp67d5213qtvs",
            "reminders": {
              "useDefault": true
            }
          },
          {
            "kind": "calendar#event",
            "etag": "\"2832840872774000\"",
            "id": "ucnagvfr1ef63lrn8rlulbanqc",
            "status": "confirmed",
            "htmlLink": "https://www.google.com/calendar/event?eid=dWNuYWd2ZnIxZWY2M2xybjhybHVsYmFucWMgc2NvdHRAaG9ub3B1LmNvbQ",
            "created": "2014-11-19T18:07:16.000Z",
            "updated": "2014-11-19T18:07:16.387Z",
            "summary": "Scott Event 3",
            "creator": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "organizer": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "start": {
              "dateTime": "2014-11-21T05:30:00-05:00"
            },
            "end": {
              "dateTime": "2014-11-21T12:00:00-05:00"
            },
            "iCalUID": "ucnagvfr1ef63lrn8rlulbanqc@google.com",
            "sequence": 0,
            "hangoutLink": "https://plus.google.com/hangouts/_/honopu.com/scott?hceid=c2NvdHRAaG9ub3B1LmNvbQ.ucnagvfr1ef63lrn8rlulbanqc",
            "reminders": {
              "useDefault": true
            }
          },
          {
            "kind": "calendar#event",
            "etag": "\"2832840888852000\"",
            "id": "07kboie9ekua56rh9bv9nbq7v8",
            "status": "confirmed",
            "htmlLink": "https://www.google.com/calendar/event?eid=MDdrYm9pZTlla3VhNTZyaDlidjluYnE3djggc2NvdHRAaG9ub3B1LmNvbQ",
            "created": "2014-11-19T18:07:24.000Z",
            "updated": "2014-11-19T18:07:24.426Z",
            "summary": "Scott Event 4",
            "creator": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "organizer": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "start": {
              "dateTime": "2014-11-22T11:00:00-05:00"
            },
            "end": {
              "dateTime": "2014-11-22T20:30:00-05:00"
            },
            "iCalUID": "07kboie9ekua56rh9bv9nbq7v8@google.com",
            "sequence": 0,
            "hangoutLink": "https://plus.google.com/hangouts/_/honopu.com/scott?hceid=c2NvdHRAaG9ub3B1LmNvbQ.07kboie9ekua56rh9bv9nbq7v8",
            "reminders": {
              "useDefault": true
            }
          },
          {
            "kind": "calendar#event",
            "etag": "\"2832840914638000\"",
            "id": "11drgovck13fc24e78m2tvrkn8",
            "status": "confirmed",
            "htmlLink": "https://www.google.com/calendar/event?eid=MTFkcmdvdmNrMTNmYzI0ZTc4bTJ0dnJrbjggc2NvdHRAaG9ub3B1LmNvbQ",
            "created": "2014-11-19T18:07:37.000Z",
            "updated": "2014-11-19T18:07:37.319Z",
            "summary": "Another Event on Saturday",
            "creator": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "organizer": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "start": {
              "dateTime": "2014-11-22T04:30:00-05:00"
            },
            "end": {
              "dateTime": "2014-11-22T07:30:00-05:00"
            },
            "iCalUID": "11drgovck13fc24e78m2tvrkn8@google.com",
            "sequence": 0,
            "hangoutLink": "https://plus.google.com/hangouts/_/honopu.com/scott?hceid=c2NvdHRAaG9ub3B1LmNvbQ.11drgovck13fc24e78m2tvrkn8",
            "reminders": {
              "useDefault": true
            }
          },
          {
            "kind": "calendar#event",
            "etag": "\"2832840934938000\"",
            "id": "5n8l1jfl4pkk0149tepuvo4vds",
            "status": "confirmed",
            "htmlLink": "https://www.google.com/calendar/event?eid=NW44bDFqZmw0cGtrMDE0OXRlcHV2bzR2ZHMgc2NvdHRAaG9ub3B1LmNvbQ",
            "created": "2014-11-19T18:07:47.000Z",
            "updated": "2014-11-19T18:07:47.469Z",
            "summary": "2nd event on Friday",
            "creator": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "organizer": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "start": {
              "dateTime": "2014-11-21T14:00:00-05:00"
            },
            "end": {
              "dateTime": "2014-11-21T17:00:00-05:00"
            },
            "iCalUID": "5n8l1jfl4pkk0149tepuvo4vds@google.com",
            "sequence": 0,
            "hangoutLink": "https://plus.google.com/hangouts/_/honopu.com/scott?hceid=c2NvdHRAaG9ub3B1LmNvbQ.5n8l1jfl4pkk0149tepuvo4vds",
            "reminders": {
              "useDefault": true
            }
          },
          {
            "kind": "calendar#event",
            "etag": "\"2832840946420000\"",
            "id": "mn4ttl06bbok9vif5qftpb2s20",
            "status": "confirmed",
            "htmlLink": "https://www.google.com/calendar/event?eid=bW40dHRsMDZiYm9rOXZpZjVxZnRwYjJzMjAgc2NvdHRAaG9ub3B1LmNvbQ",
            "created": "2014-11-19T18:07:53.000Z",
            "updated": "2014-11-19T18:07:53.210Z",
            "summary": "3rd event on friday",
            "creator": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "organizer": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "start": {
              "dateTime": "2014-11-21T19:00:00-05:00"
            },
            "end": {
              "dateTime": "2014-11-21T23:00:00-05:00"
            },
            "iCalUID": "mn4ttl06bbok9vif5qftpb2s20@google.com",
            "sequence": 0,
            "hangoutLink": "https://plus.google.com/hangouts/_/honopu.com/scott?hceid=c2NvdHRAaG9ub3B1LmNvbQ.mn4ttl06bbok9vif5qftpb2s20",
            "reminders": {
              "useDefault": true
            }
          },
          {
            "kind": "calendar#event",
            "etag": "\"2832999878956000\"",
            "id": "10nsl1n755dvh5msn53sv71gpc",
            "status": "confirmed",
            "htmlLink": "https://www.google.com/calendar/event?eid=MTBuc2wxbjc1NWR2aDVtc241M3N2NzFncGMgc2NvdHRAaG9ub3B1LmNvbQ",
            "created": "2014-11-20T16:12:19.000Z",
            "updated": "2014-11-20T16:12:19.478Z",
            "summary": "An Event Today",
            "creator": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "organizer": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "start": {
              "dateTime": "2014-11-20T14:00:00-05:00"
            },
            "end": {
              "dateTime": "2014-11-20T18:30:00-05:00"
            },
            "iCalUID": "10nsl1n755dvh5msn53sv71gpc@google.com",
            "sequence": 0,
            "hangoutLink": "https://plus.google.com/hangouts/_/honopu.com/scott?hceid=c2NvdHRAaG9ub3B1LmNvbQ.10nsl1n755dvh5msn53sv71gpc",
            "reminders": {
              "useDefault": true
            }
          },
          {
            "kind": "calendar#event",
            "etag": "\"2833029454270000\"",
            "id": "aif4ab41td6tm7ellarolisj3c",
            "status": "confirmed",
            "htmlLink": "https://www.google.com/calendar/event?eid=YWlmNGFiNDF0ZDZ0bTdlbGxhcm9saXNqM2Mgc2NvdHRAaG9ub3B1LmNvbQ",
            "created": "2014-11-20T20:18:47.000Z",
            "updated": "2014-11-20T20:18:47.135Z",
            "summary": "Appointment",
            "location": "Somewhere",
            "creator": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "organizer": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "start": {
              "dateTime": "2014-11-20T18:18:47-05:00",
              "timeZone": "America/New_York"
            },
            "end": {
              "dateTime": "2014-11-20T20:18:47-05:00",
              "timeZone": "America/New_York"
            },
            "iCalUID": "aif4ab41td6tm7ellarolisj3c@google.com",
            "sequence": 0,
            "hangoutLink": "https://plus.google.com/hangouts/_/honopu.com/scott?hceid=c2NvdHRAaG9ub3B1LmNvbQ.aif4ab41td6tm7ellarolisj3c",
            "reminders": {
              "useDefault": true
            }
          },
          {
            "kind": "calendar#event",
            "etag": "\"2833029613814000\"",
            "id": "ueunpgn1l581oi2sr2i8hjalf8",
            "status": "confirmed",
            "htmlLink": "https://www.google.com/calendar/event?eid=dWV1bnBnbjFsNTgxb2kyc3IyaThoamFsZjggc2NvdHRAaG9ub3B1LmNvbQ",
            "created": "2014-11-20T20:20:06.000Z",
            "updated": "2014-11-20T20:20:06.907Z",
            "summary": "Appointment",
            "location": "Somewhere",
            "creator": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "organizer": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "start": {
              "dateTime": "2014-11-20T18:20:06-05:00",
              "timeZone": "America/New_York"
            },
            "end": {
              "dateTime": "2014-11-20T20:20:06-05:00",
              "timeZone": "America/New_York"
            },
            "iCalUID": "ueunpgn1l581oi2sr2i8hjalf8@google.com",
            "sequence": 0,
            "hangoutLink": "https://plus.google.com/hangouts/_/honopu.com/scott?hceid=c2NvdHRAaG9ub3B1LmNvbQ.ueunpgn1l581oi2sr2i8hjalf8",
            "reminders": {
              "useDefault": true
            }
          },
          {
            "kind": "calendar#event",
            "etag": "\"2833035593054000\"",
            "id": "jhi5t1k14t4cita89k231ai2m0",
            "status": "confirmed",
            "htmlLink": "https://www.google.com/calendar/event?eid=amhpNXQxazE0dDRjaXRhODlrMjMxYWkybTAgc2NvdHRAaG9ub3B1LmNvbQ",
            "created": "2014-11-20T21:09:56.000Z",
            "updated": "2014-11-20T21:09:56.527Z",
            "description": "sdfgsdfg",
            "creator": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "organizer": {
              "email": "scott@honopu.com",
              "displayName": "Scott Conrad",
              "self": true
            },
            "start": {
              "dateTime": "2014-11-25T07:35:00-05:00"
            },
            "end": {
              "dateTime": "2014-11-25T20:40:00-05:00"
            },
            "iCalUID": "jhi5t1k14t4cita89k231ai2m0@google.com",
            "sequence": 0,
            "hangoutLink": "https://plus.google.com/hangouts/_/honopu.com/scott?hceid=c2NvdHRAaG9ub3B1LmNvbQ.jhi5t1k14t4cita89k231ai2m0",
            "reminders": {
              "useDefault": true
            }
          }
        ];



    },1000);





    $scope.$watch('google_auth.access_token', function () {
      $scope.getCalendarList(); //this could probably be named better.. slike populate calendar list

    });

    $scope.getEventsForDate = function () {

      $scope.google_calendar.getListForDate($scope.selected_date).then(function (data) {
        $scope.calendar_events = data;
      });
    }


    $scope.updateEventCalendar = function (i) {
      $scope.google_calendar.setActiveCalendar(i);
    }

  });

})(undefined); //no global namespace pollution

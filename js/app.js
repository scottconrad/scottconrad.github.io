(function (undefined) {

  var google_module = angular.module('Google', []);

  google_module.service('GoogleAuth', function ($location, $http, $rootScope) {

    var access_token = null;
    var client_id = '682690953089-pcokcr123r9m8v602p0rv9bi9vkfcsc0.apps.googleusercontent.com';
    var token_valid = false;

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
      }
    }

    //ugh
    $rootScope.$on('authentication.invalid', function () {
      alert("we're lame");
      obj.setTokenInvalid();
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

      getActiveCalendarName:function(){
        if(active_calendar && active_calendar.name) return active_calendar.name;
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
            'timeMax': max_time
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
          'url': 'https://www.googleapis.com/calendar/v3/calendars/' + id.toString() + '/events',
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

    $scope.authorize_url = 'https://accounts.google.com/o/oauth2/auth?redirect_uri=http%3A%2F%2Fhonopu.com' +
    '%2Fmobiquity&response_type=token&client_id={{google_auth.getClientID()}}&scope=email+https%3A%2F%2F' +
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


    $scope.google_auth = GoogleAuth;
    $scope.google_calendar = GoogleCalendar;

    $scope.calendar_id = null;

    $scope.calendars = [];
    $scope.calendar_events = [];

    $scope.selected_date = null;

    $scope.dateChanged = function () {

      console.log("the date changed");
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


    $scope.getCalendarEvents = function () {


    }
    $scope.getCalendarList = function () {
      $scope.google_calendar.getList().then(function (data) {
        $scope.calendars = data;
      });
    }

    $scope.updateEventDateFromCalendar = function (calendar) {
      $scope.event.start.timeZone = $scope.event.end.timeZone = calendar.timeZone;

    }


    $scope.getListForSelectedCalendar = function () {

      var encoded = encodeURIComponent($scope.calendar_id); //


      $scope.google_calendar.getListForCalendarId(encoded).then(function (data) {
        $scope.calendar_events = data;
      });

      $scope.google_calendar.getListForCurrentDate().then(function (data) {
        console.log("our current day list is:", data);
        $scope.current_day_events = data;
      });

    }

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

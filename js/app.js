(function (undefined) {

  var util = {
    'set':function(obj){
      return (typeof obj !== "undefined" && obj !== null);
    },
    'empty':function(obj){
      if(!this.set(obj)) return true;
      return this.isArray(obj) && obj.length === 0;

    },
    'isArray':function(obj){
      return toString.call(obj) === '[object Array]';
    }
  }


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
            localStorage['mobiquity_access_token'] = access_token;
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
      },
      populateAccessTokenFromLocalStorage:function(){
        var mob_access_token = localStorage['mobiquity_access_token'];
        //there is an api to check if an access token is invalid but I didn't implement it
        if(mob_access_token !== null) {
          token_valid = true; //we trust that it's still valid, the first request again triggers an error if it isn't
          access_token = mob_access_token;
        }
        //while we are using it.. the first request will trigger an error
      }
    }

    //ugh
    $rootScope.$on('authentication.invalid', function () {

      obj.setTokenInvalid();
      obj.setTokenRejected(true);
    });

    obj.populateAccessTokenFromLocalStorage();


    return obj;

  });

  google_module.service('GoogleCalendar', function ($location, $http, GoogleAuth, $q) {

    var auth = GoogleAuth; //i know this isn't exactly necessary but I think its easier to follow
    var active_calendar = null;

    var obj = {
      getAuthHeaderData: function () {
        return {'Authorization': 'Bearer ' + auth.getAccessToken()}

      },

      getActiveCalendarName:function(){ //i should call get get summary but I think name is better
        if(util.set(active_calendar) && util.set(active_calendar.summary)) return active_calendar.summary;
      },

      getListForDate: function (date) {
        var deferred = $q.defer();
        //code smell.. i know i know.. on a deadline
        if (!GoogleAuth.getAccessToken() || !util.set(active_calendar)) {
          deferred.resolve([]);
          return deferred.promise;
        }

        var day = moment(date);
        var day2 = moment(date);

        var min_time = day.startOf('day').toISOString();
        var max_time = day2.startOf('day').add(1, 'day').toISOString();

        var deferred = $q.defer();

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
        active_calendar = id;
        $http({
          'method': 'GET',
          'url': 'https://www.googleapis.com/calendar/v3/calendars/' + id.toString() + '/events?orderBy=startTime&' +
          'singleEvents=true',
          'headers': this.getAuthHeaderData()
        }).success(function (data) {
          //get ourselves a list we can populate a dropdown from
          deferred.resolve(data.items);
        });
        return deferred.promise;

      },

      createEvent: function (data) {

        var start_hour = data.start.hour;

        var end_hour = data.end.hour;

        if (parseInt(data.start.meridian) == 2) start_hour += 12;

        if (parseInt(data.end.meridian) == 2) end_hour += 12;

        var moment_date_start = moment(data.start.date);
        var moment_date_end = angular.copy(moment_date_start);


        moment_date_start.hour(start_hour).minute(data.start.minute);
        moment_date_end.hour(end_hour).minute(data.end.minute);


        data.start = {'dateTime': moment_date_start.format("YYYY-MM-DDTHH:mm:ssZ"), 'timeZone': data.start.timeZone};
        data.end = {'dateTime': moment_date_end.format("YYYY-MM-DDTHH:mm:ssZ"), 'timeZone': data.end.timeZone};

        return $http({
          'method': 'POST',
          'url': 'https://www.googleapis.com/calendar/v3/calendars/' + data.calendar_id.toString() + '/events',
          'headers': this.getAuthHeaderData(),
          'data': data
        });
      },
      setActiveCalendar:function(calendar){
        localStorage['mobiquity_active_calendar'] = JSON.stringify(calendar);
        active_calendar = calendar;
      },
      getActiveCalendar:function(){

        return active_calendar;
      },
      populateActiveCalendarFromLocalStorage:function(){
        var local_storage_active_calendar = localStorage['mobiquity_active_calendar'];
        if(util.set(local_storage_active_calendar)) {
          var cal = JSON.parse(local_storage_active_calendar);
          active_calendar = cal;
        }

        return cal;
        }
    }

    obj.populateActiveCalendarFromLocalStorage();

    return obj;


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
            //$injector.get('GoogleAuth').setInvalidToken();  not sure why this isn't working... says it isn't found,
            // but i'm using it I know this is a judo and i'm not happy with it
            $rootScope.$broadcast('authentication.invalid'); //ugh i hate this perhaps I can circle back later
          }else{
            alert("There was an error retrieving data from the google api");
          }

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

    $scope.calendar = null;

    $scope.selected_date = moment().toDate();

    ///////
    $scope.formatEventDate = function(date,format){
      if (!format) format = "MMMM Do, YYYY [at] h:mma";
      var formatted_date = moment(date).format(format);
      return formatted_date;

    }

    $scope.formatEventDateTime = function(dt){
      var format = "MMMM Do, YYYY [at] h:mma";
      return moment(dt).format(format);

    }

    $scope.getSelectedDateDisplay = function(){
      var format = 'MMMM Do, YYYY';

      return $scope.formatEventDate(angular.copy($scope.selected_date),format);
    }

    $scope.event = {
      summary: '',
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
      'calendar_id': '',
      'calendar':null
    }


    $scope.authenticatedAndValid = function(){
      return $scope.google_auth.tokenValid() && !$scope.google_auth.getTokenRejected();
    }

    $scope.showAuthenticationError = function(){

      return $scope.google_auth.getAccessToken() &&
        $scope.google_auth.getAccessToken().length > 0 && $scope.google_auth.getTokenRejected();
    }

    $scope.createEvent = function () {
      var valid = $scope.addEvent.$valid;
      if (valid) {
        $scope.google_calendar.createEvent($scope.event).then(function(){
          //at this point we may not necessarily have an active calendar
          if(util.set($scope.google_calendar.getActiveCalendar())){
            $scope.getListForSelectedCalendar($scope.google_calendar.getActiveCalendar());
          }
          $scope.addEvent.$setSubmitted(false);
        });
      }
    }

    ///////
    $scope.google_auth.parseGoogleAuthTokenFromCurrentLocation();


    $scope.getCalendarList = function () {
      $scope.google_calendar.getList().then(function (data) {
        $scope.calendars = data;
      });
    }

    $scope.updateEventDataFromCalendar = function () {
      $scope.event.calendar_id = $scope.event.calendar.id;
      $scope.event.start.timeZone = $scope.event.end.timeZone = $scope.event.calendar.timeZone;

    }

    $scope.getListForSelectedCalendar = function () {
      $scope.current_day_events = [];
      $scope.calendar_events = [];
      if(!$scope.calendar || !$scope.calendar.id) return;
      //i was just getting the id before, but refactored this so I can get the name of the calendar..
      //i could also do this when I get the event list for a calendar but I like it this way better.

      var encoded = encodeURIComponent($scope.calendar.id); //
      $scope.google_calendar.setActiveCalendar($scope.calendar);
      $scope.google_calendar.getListForCalendarId(encoded).then(function (data) {
        $scope.calendar_events = data;

      });

      $scope.dateChanged(); //trigger this here since that happens about as often but that can trigger a day update..
      //but you can selet a date and not change the calendar so it should update
    }

    $scope.$watch('google_auth.access_token', function () {
      $scope.getCalendarList(); //this could probably be named better.. slike populate calendar list

    });

    $scope.getEventsForDate = function () {
      $scope.google_calendar.getListForDate($scope.selected_date).then(function (data) {
        $scope.current_day_events = data;
      });
    }



    $scope.dateChanged = function(){
      $scope.getEventsForDate();
    }




    $scope.getActiveCalendarName = function(){
      if($scope.calendar && $scope.calendar.hasOwnProperty('summary')) return $scope.calendar.summary;
    }

    if($scope.google_calendar.getActiveCalendar()) {
      $scope.calendar = $scope.google_calendar.getActiveCalendar();
      $scope.getListForSelectedCalendar();
    }


  });

})(undefined); //no global namespace pollution
